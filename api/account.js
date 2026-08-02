import { handleAccountRequest } from '../server/accountAuth.js';

export default async function handler(request, response) {
  return handleAccountRequest(request, response);
}
