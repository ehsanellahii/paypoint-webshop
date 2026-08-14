import { z } from 'zod';

export const registrationSchema = z
  .object({
    customerName: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),

    phoneCode: z.string().regex(/^\+\d{1,4}$/, 'Invalid country code'),

    phoneNumber: z
      .string()
      .trim()
      // digits only (because we cleaned it in the input)
      .regex(/^\d{6,15}$/, 'Phone number must be 6–15 digits'),
  })
  .superRefine((val, ctx) => {
    const full = `${val.phoneCode}${val.phoneNumber}`; // e.g. +491512345678
    // light E.164 shape check (not perfect, but solid)
    if (!/^\+\d{7,16}$/.test(full)) {
      ctx.addIssue({
        code: 'custom',
        path: ['phoneNumber'],
        message: 'Invalid phone number format',
      });
    }
  });

export const loginSchema = z
  .object({
    // The prototype's sign-in panel asks for a name alongside the number.
    customerName: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),

    phoneCode: z.string().regex(/^\+\d{1,4}$/, 'Invalid country code'),

    phoneNumber: z
      .string()
      .trim()
      // digits only (because we cleaned it in the input)
      .regex(/^\d{6,15}$/, 'Phone number must be 6–15 digits'),
  })
  .superRefine((val, ctx) => {
    const full = `${val.phoneCode}${val.phoneNumber}`; // e.g. +491512345678
    // light E.164 shape check (not perfect, but solid)
    if (!/^\+\d{7,16}$/.test(full)) {
      ctx.addIssue({
        code: 'custom',
        path: ['phoneNumber'],
        message: 'Invalid phone number format',
      });
    }
  });

export type RegistrationFormValues = z.infer<typeof registrationSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
