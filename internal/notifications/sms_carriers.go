// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package notifications

// SMSCarrier represents a single email-to-SMS gateway entry.
// Carriers sharing the same gateway domain are merged into one entry;
// the Label reflects all provider names that use that domain.
type SMSCarrier struct {
	Label  string
	Domain string
}

// SMSCarrierGroup groups carriers by geographic region for UI optgroup rendering.
type SMSCarrierGroup struct {
	Region   string
	Carriers []SMSCarrier
}

// SMSCarrierOther is the sentinel domain value for the "Other / Custom" option.
const SMSCarrierOther = "other"

// SMSCarrierGroups is the full list of known email-to-SMS gateways, grouped by region.
// Sources: AVTECH, Quertime, IFLSWEB. Last reviewed June 2026.
var SMSCarrierGroups = []SMSCarrierGroup{
	{
		Region: "United States",
		Carriers: []SMSCarrier{
			{Label: "AT&T / Cingular / Cincinnati Bell", Domain: "txt.att.net"},
			{Label: "Verizon / Twigby / Xfinity Mobile / Visible / US Mobile", Domain: "vtext.com"},
			{Label: "T-Mobile / VoiceStream / Powertel", Domain: "tmomail.net"},
			{Label: "Sprint PCS", Domain: "messaging.sprintpcs.com"},
			{Label: "Boost Mobile", Domain: "myboostmobile.com"},
			{Label: "Metro PCS", Domain: "mymetropcs.com"},
			{Label: "Cricket Wireless", Domain: "sms.cricketwireless.net"},
			{Label: "US Cellular", Domain: "email.uscc.net"},
			{Label: "Nextel", Domain: "messaging.nextel.com"},
			{Label: "Google Fi", Domain: "msg.fi.google.com"},
			{Label: "Virgin Mobile / Assurance Wireless", Domain: "vmobl.com"},
			{Label: "Cellular South", Domain: "csouth1.com"},
			{Label: "CenturyTel", Domain: "messaging.centurytel.net"},
			{Label: "Alltel", Domain: "alltelmessage.com"},
			{Label: "Alltel PCS", Domain: "message.alltel.com"},
			{Label: "Cellular One", Domain: "mobile.celloneusa.com"},
			{Label: "ACS Wireless / Ameritech Paging / SBC Ameritech", Domain: "paging.acswireless.com"},
			{Label: "Advantage Communications", Domain: "advantagepaging.com"},
			{Label: "Bluegrass Cellular", Domain: "sms.bluecell.com"},
			{Label: "Edge Wireless", Domain: "sms.edgewireless.com"},
			{Label: "GCS Paging", Domain: "webpager.us"},
			{Label: "Houston Cellular", Domain: "text.houstoncellular.net"},
			{Label: "Inland Cellular", Domain: "inlandlink.com"},
			{Label: "Midwest Wireless", Domain: "clearlydigital.com"},
			{Label: "Morris Wireless", Domain: "beepone.net"},
			{Label: "NPI Wireless", Domain: "npiwireless.com"},
			{Label: "Ntelos", Domain: "pcs.ntelos.com"},
			{Label: "Pioneer / Enid Cellular", Domain: "msg.pioneerenidcellular.com"},
			{Label: "Qwest", Domain: "qwestmp.com"},
			{Label: "Simple Freedom", Domain: "text.simplefreedom.net"},
			{Label: "Southern LINC", Domain: "page.southernlinc.com"},
			{Label: "Surewest Communications", Domain: "mobile.surewest.com"},
			{Label: "TSR Wireless", Domain: "beep.com"},
			{Label: "Unicel", Domain: "utext.com"},
			{Label: "US West", Domain: "uswestdatamail.com"},
			{Label: "West Central Wireless", Domain: "sms.wcc.net"},
			{Label: "Western Wireless", Domain: "cellularonewest.com"},
			{Label: "3 River Wireless", Domain: "sms.3rivers.net"},
			{Label: "Tello / Ultra Mobile", Domain: "mailmymobile.net"},
			{Label: "Ting", Domain: "message.ting.com"},
		},
	},
	{
		Region: "Canada",
		Carriers: []SMSCarrier{
			{Label: "Bell Canada / Bell Mobility", Domain: "txt.bellmobility.ca"},
			{Label: "Rogers / Microcell", Domain: "sms.rogers.com"},
			{Label: "Telus", Domain: "msg.telus.com"},
			{Label: "Fido", Domain: "fido.ca"},
			{Label: "Manitoba Telecom Systems", Domain: "text.mtsmobility.com"},
			{Label: "NBTel", Domain: "wirefree.informe.ca"},
			{Label: "PageNet Canada", Domain: "pagegate.pagenet.ca"},
		},
	},
	{
		Region: "Europe",
		Carriers: []SMSCarrier{
			{Label: "T-Mobile Germany / DT T-Mobile", Domain: "t-mobile-sms.de"},
			{Label: "T-Mobile Austria", Domain: "sms.t-mobile.at"},
			{Label: "T-Mobile UK", Domain: "t-mobile.uk.net"},
			{Label: "O2 UK", Domain: "mmail.co.uk"},
			{Label: "Orange / Orange Netherlands / Dutchtone", Domain: "sms.orange.nl"},
			{Label: "SFR France", Domain: "sfr.fr"},
			{Label: "Vodafone Italy", Domain: "sms.vodafone.it"},
			{Label: "Vodafone Spain", Domain: "vodafone.es"},
			{Label: "Movistar / Telefonica Movistar", Domain: "correo.movistar.net"},
			{Label: "Mobistar Belgium", Domain: "mobistar.be"},
			{Label: "Comviq Sweden", Domain: "sms.comviq.se"},
			{Label: "Telia Denmark", Domain: "gsm1800.telia.dk"},
			{Label: "Telenor Norway", Domain: "mobilpost.no"},
			{Label: "Netcom Norway", Domain: "sms.netcom.no"},
			{Label: "Meteor Ireland", Domain: "mymeteor.ie"},
			{Label: "Swisscom", Domain: "bluewin.ch"},
			{Label: "Sunrise Mobile Switzerland", Domain: "mysunrise.ch"},
			{Label: "P&T Luxembourg", Domain: "sms.luxgsm.lu"},
			{Label: "One Connect Austria", Domain: "onemail.at"},
			{Label: "PlusGSM Poland", Domain: "text.plusgsm.pl"},
			{Label: "Oskar Czech Republic", Domain: "mujoskar.cz"},
			{Label: "EMT Estonia", Domain: "sms.emt.ee"},
			{Label: "LMT Latvia / Kyivstar Ukraine", Domain: "smsmail.lmt.lv"},
			{Label: "Tele2 Latvia", Domain: "sms.tele2.lv"},
			{Label: "BeeLine GSM Russia", Domain: "sms.beemail.ru"},
			{Label: "Golden Telecom Russia", Domain: "sms.goldentele.com"},
			{Label: "Primtel Russia", Domain: "sms.primtel.ru"},
			{Label: "Uraltel Russia", Domain: "sms.uraltel.ru"},
			{Label: "Mobtel Srbija", Domain: "mobtel.co.yu"},
		},
	},
	{
		Region: "Asia / Pacific",
		Carriers: []SMSCarrier{
			{Label: "Optus Mobile Australia", Domain: "optusmobile.com.au"},
			{Label: "Vodafone Japan", Domain: "c.vodafone.ne.jp"},
			{Label: "Smart Telecom Philippines", Domain: "mysmart.mymobile.ph"},
			{Label: "MiWorld / Mobileone Singapore", Domain: "m1.com.sg"},
			{Label: "Idea Cellular India", Domain: "ideacellular.net"},
			{Label: "BPL Mobile India", Domain: "bplmobile.com"},
			{Label: "Escotel India", Domain: "escotelmobile.com"},
			{Label: "Airtel India – Andhra Pradesh", Domain: "airtelap.com"},
			{Label: "Airtel India – Chennai / Skycell", Domain: "airtelchennai.com"},
			{Label: "Airtel India – Kolkata", Domain: "airtelkol.com"},
			{Label: "Airtel India – Delhi", Domain: "airtelmail.com"},
			{Label: "Emtel Mauritius", Domain: "emtelworld.net"},
		},
	},
	{
		Region: "Africa",
		Carriers: []SMSCarrier{
			{Label: "Safaricom Kenya", Domain: "safaricomsms.com"},
			{Label: "Mobitel Tanzania", Domain: "sms.co.tz"},
		},
	},
}
