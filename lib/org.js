/** The supplier block on every invoice (GST Rule 46). Set these in .env before issuing
 *  anything real — the legal billing entity for the School Grads brand must be confirmed first. */
export const ORG = {
  name: process.env.ORG_NAME || 'School Grads (billing entity TBC)',
  address: process.env.ORG_ADDRESS || 'Hyderabad, Telangana',
  gstin: process.env.ORG_GSTIN || 'GSTIN-NOT-SET',
  pan: process.env.ORG_PAN || '',
  state: process.env.ORG_STATE || 'Telangana',
  email: process.env.ORG_EMAIL || '',
  phone: process.env.ORG_PHONE || '',
  bank: process.env.ORG_BANK || '',
}

export const orgReady = () => ORG.gstin !== 'GSTIN-NOT-SET'
