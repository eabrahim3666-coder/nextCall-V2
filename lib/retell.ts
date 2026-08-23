import Retell from 'retell-sdk';

// Initialize the Retell client safely with fallback
const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY || 'dummy_retell_key',
});

export default retellClient;
