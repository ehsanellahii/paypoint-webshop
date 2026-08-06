/* eslint-disable @typescript-eslint/no-explicit-any */
const voucherApiErrorMessagesWithCode = [
  {
    code: 'VOUCHER_NOT_FOUND',
    message: 'The voucher code you entered does not exist. Please check the code and try again.',
  },
  {
    code: 'LIMIT_EXCEEDED',
    message: 'You have exceeded the usage limit for this voucher. Please check the voucher terms and conditions.',
  },
  {
    code: 'MINIMUM_ORDER_VALUE_NOT_MET',
    message: 'Your order does not meet the minimum value required to apply this voucher. Please add more items to your cart.',
  },
  {
    code: 'CUSTOMER_NOT_FOUND',
    message: 'The customer associated with this voucher could not be found. Please ensure you are logged in with the correct account.',
  },
];

const getTranslatedVoucherApiErrorMessage = (code: string, message: string, t: any): string => {
  const errorEntry = voucherApiErrorMessagesWithCode.find((entry) => entry.code === code);
  if (errorEntry) {
    return t[errorEntry.code];
  }

  return message;
};

export { getTranslatedVoucherApiErrorMessage };
