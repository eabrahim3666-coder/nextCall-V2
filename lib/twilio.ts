import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC00000000000000000000000000000000';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'dummy_auth_token';

// Initialize the Twilio client safely
const twilioClient = Twilio(accountSid, authToken);

export default twilioClient;
