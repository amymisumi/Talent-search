import emailjs from '@emailjs/browser';

// Initialize EmailJS with your service ID
const SERVICE_ID = 'your_service_id'; // Replace with your EmailJS service ID
const TEMPLATE_ID = 'your_template_id'; // Replace with your EmailJS template ID
const PUBLIC_KEY = 'your_public_key'; // Replace with your EmailJS public key

// Initialize EmailJS
emailjs.init(PUBLIC_KEY);

export interface EmailData {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  from_name?: string;
}

export const sendSupportEmail = async (emailData: EmailData): Promise<void> => {
  try {
    const templateParams = {
      to_email: emailData.to_email,
      to_name: emailData.to_name,
      subject: emailData.subject,
      message: emailData.message,
      from_name: emailData.from_name || 'Talent Search Africa Support'
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
    console.log('Support email sent successfully');
  } catch (error) {
    console.error('Error sending support email:', error);
    throw new Error('Failed to send support email');
  }
};

export const sendBulkEmails = async (emails: EmailData[]): Promise<void> => {
  try {
    const promises = emails.map(emailData => sendSupportEmail(emailData));
    await Promise.all(promises);
    console.log('Bulk emails sent successfully');
  } catch (error) {
    console.error('Error sending bulk emails:', error);
    throw new Error('Failed to send bulk emails');
  }
};
