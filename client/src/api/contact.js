import { apiRequest } from './client.js';

export async function sendContactMessage(message) {
  return apiRequest('/contact', {
    method: 'POST',
    body: message,
  });
}
