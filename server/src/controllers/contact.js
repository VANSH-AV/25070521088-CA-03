import { ContactMessage } from '../models/ContactMessage.js';

const RECEIVED_MESSAGE = 'Thanks — your message has been received.';

export async function createContactMessage(req, res) {
  const { website, ...message } = req.body;

  if (!website) {
    await ContactMessage.create({ ...message, status: 'new' });
  }

  return res.status(201).json({
    success: true,
    data: { message: RECEIVED_MESSAGE },
  });
}
