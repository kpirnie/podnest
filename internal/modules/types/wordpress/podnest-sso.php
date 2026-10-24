<?php
/**
 * Plugin Name: PodNest SSO
 * Description: Single sign-on into wp-admin from the PodNest panel. Managed by PodNest — read-only, replaced on every panel start.
 * Author: Kevin Pirnie
 * Author URI: https://kevinpirnie.com
 *
 * @package PodNest
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'podnest_sso_b64d' ) ) {

	/**
	 * Decode a base64url string, restoring any stripped padding
	 *
	 * @param string $s the base64url encoded string
	 * @return string|false the decoded bytes, or false on invalid input
	 */
	function podnest_sso_b64d( string $s ) {
		$s = strtr( $s, '-_', '+/' );
		return base64_decode( str_pad( $s, (int) ( ceil( strlen( $s ) / 4 ) * 4 ), '=' ), true );
	}
}

if ( ! function_exists( 'podnest_sso_user' ) ) {

	/**
	 * Resolve the administrator to sign in as — the selected user when it is
	 * still an administrator, otherwise the first administrator by ID
	 *
	 * @param int $uid the selected WordPress user ID, 0 for none
	 * @return WP_User|null the user to sign in as, or null if there are no administrators
	 */
	function podnest_sso_user( int $uid ): ?WP_User {
		if ( $uid > 0 ) {
			$user = get_userdata( $uid );
			if ( $user && in_array( 'administrator', (array) $user->roles, true ) ) {
				return $user;
			}
		}

		$admins = get_users(
			array(
				'role'    => 'administrator',
				'orderby' => 'ID',
				'order'   => 'ASC',
				'number'  => 1,
			)
		);
		return $admins[0] ?? null;
	}
}

add_action(
	'init',
	static function (): void {

		// only act on an sso hand-off from the panel
		if ( empty( $_GET['podnest_sso'] ) || ! is_string( $_GET['podnest_sso'] ) ) {
			return;
		}

		$fail = static function (): void {
			wp_die( esc_html( 'This PodNest sign-in link is invalid or has expired.' ), '', array( 'response' => 403 ) );
		};

		$parts = explode( '.', sanitize_text_field( wp_unslash( $_GET['podnest_sso'] ) ) );
		if ( 2 !== count( $parts ) || ! defined( 'AUTH_KEY' ) || ! defined( 'AUTH_SALT' ) ) {
			$fail();
		}

		// the key derives from this site's own salts, so only something that can
		// read wp-config.php — the panel — can mint a valid token
		$key = hash_hmac( 'sha256', 'podnest-sso', AUTH_KEY . AUTH_SALT );
		$sig = podnest_sso_b64d( $parts[1] );
		if ( false === $sig || ! hash_equals( hash_hmac( 'sha256', $parts[0], $key, true ), $sig ) ) {
			$fail();
		}

		// short-lived: expired, or minted further out than the panel ever issues
		$claims = json_decode( (string) podnest_sso_b64d( $parts[0] ), true );
		$now    = time();
		if ( ! is_array( $claims ) || empty( $claims['exp'] ) || empty( $claims['nonce'] )
			|| (int) $claims['exp'] < $now || (int) $claims['exp'] > $now + 120
			|| ! preg_match( '/^[a-f0-9]{32}$/', (string) $claims['nonce'] ) ) {
			$fail();
		}

		// single use — the nonce is burned for longer than any token can live
		$burn = sprintf( 'podnest_sso_%s', $claims['nonce'] );
		if ( false !== get_transient( $burn ) ) {
			$fail();
		}
		set_transient( $burn, 1, 5 * MINUTE_IN_SECONDS );

		$user = podnest_sso_user( (int) ( $claims['uid'] ?? 0 ) );
		if ( ! $user ) {
			$fail();
		}

		wp_set_current_user( $user->ID );
		wp_set_auth_cookie( $user->ID, false, is_ssl() );
		wp_safe_redirect( admin_url() );
		exit;
	},
	1
);
