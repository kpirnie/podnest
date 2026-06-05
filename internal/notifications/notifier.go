package notifications

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sns"
	snstypes "github.com/aws/aws-sdk-go-v2/service/sns/types"

	"podnest/internal/logger"
	"podnest/internal/models"
)

// SNSConfig holds AWS credentials and region for SMS delivery via SNS.
type SNSConfig struct {
	AccessKey string
	SecretKey string
	Region    string
	SenderID  string // optional; supported in select AWS regions
}

// Dispatch sends email and/or SMS notifications to all qualifying users.
// Email recipients must have NotifyEmail=true and a non-empty Email address.
// SMS recipients must have NotifySMS=true and a non-empty Phone number.
// subject/body are used for email; message is the SMS payload (keep under 160 chars).
func Dispatch(users []*models.User, smtpCfg SMTPConfig, snsCfg SNSConfig, subject, body, message string) {
	for _, u := range users {
		if u.NotifyEmail && u.Email != "" {
			if err := SendEmail(smtpCfg, u.Email, subject, body); err != nil {
				logger.Error("Dispatch: email to user %d (%s) failed: %v", u.ID, u.Email, err)
			}
		}
		if u.NotifySMS && u.Phone != "" {
			if err := SendSMS(snsCfg, u.Phone, message); err != nil {
				logger.Error("Dispatch: SMS to user %d (%s) failed: %v", u.ID, u.Phone, err)
			}
		}
	}
}

// SendSMS delivers a text message to an E.164 phone number via AWS SNS.
func SendSMS(cfg SNSConfig, phone, message string) error {
	// build the SNS client from static credentials — no shared config file required
	client := sns.NewFromConfig(aws.Config{
		Region:      cfg.Region,
		Credentials: credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, ""),
	})

	input := &sns.PublishInput{
		PhoneNumber: aws.String(phone),
		Message:     aws.String(message),
	}

	// attach a Sender ID where the destination region supports alphanumeric sender names
	if cfg.SenderID != "" {
		input.MessageAttributes = map[string]snstypes.MessageAttributeValue{
			"AWS.SNS.SMS.SenderID": {
				DataType:    aws.String("String"),
				StringValue: aws.String(cfg.SenderID),
			},
		}
	}

	if _, err := client.Publish(context.Background(), input); err != nil {
		logger.Error("SendSMS: SNS publish to %s failed: %v", phone, err)
		return fmt.Errorf("SNS publish: %w", err)
	}

	logger.Debug("SendSMS: delivered to %s via SNS region %s", phone, cfg.Region)
	return nil
}
