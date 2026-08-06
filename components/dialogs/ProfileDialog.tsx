import React from 'react';
import DialogWrapper from '../DialogWrapper';
import { useUser } from '~/contexts/user-context';
import { cn } from '~/lib/utils';
import { useLanguage } from '~/contexts/language-context';

function Row({ label, value, className }: { label: string; value?: string | number | null; className?: string }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-border py-3', className)}>
      <div className='text-sm text-muted-foreground'>{label}</div>
      <div className='max-w-[60%] wrap-break-word text-right text-sm font-semibold text-foreground'>{value}</div>
    </div>
  );
}

const ProfileDialog = ({ isOpen, handleOpenChange }: { isOpen: boolean; handleOpenChange: (open: boolean) => void }) => {
  const { user, clearUser } = useUser();
  const { t } = useLanguage();
  const logout = () => {
    clearUser();
    handleOpenChange(false);
  };
  return (
    <DialogWrapper isOpen={isOpen} handleOpenChange={handleOpenChange} title={t.profile} ContentClassName='max-h-[calc(100dvh-20dvh)] max-w-[50dvh]'>
      <div className='size-full px-6 py-4 flex- flex flex-col justify-between'>
        <div>
          <Row label={t.name} value={user?.name} />
          <Row label={t.email} value={user?.email} />
          <Row label={t.phoneNumber} value={user?.phoneNumber} />
          <Row label={t.points} value={user?.points ?? 0} className='border-none' />
        </div>

        {/* <h2 className='mt-8 text-lg font-semibold text-gray-900'>Address</h2>
        <div className='mt-3 rounded-xl border border-gray-200 bg-white p-4'>
          <Row label='Street' value={user?.street} />
          <Row label='House no.' value={user?.houseNumber} />
          <Row label='City' value={user?.city} />
          <Row label='State' value={user?.state} />
          <Row label='Postal code' value={user?.postalCode} />
          <Row label='Country' value={user?.country} />
          <Row label='Full address' value={user?.address} />
        </div> */}

        {/* <h2 className='mt-8 text-lg font-semibold text-gray-900'>Vouchers</h2>
        <div className='mt-3 rounded-xl border border-gray-200 bg-white p-4'>
          <Row label='Active vouchers' value={user?.vouchers?.length ?? 0} />
          <Row label='Used vouchers' value={user?.usedVouchers?.length ?? 0} />
        </div> */}

        <div className='flex justify-end gap-x-3'>
          <button onClick={logout} className='rounded-[12px] bg-brand-red px-4 py-3 font-bold text-white transition hover:brightness-110'>
            {t?.logout ?? 'Logout'}
          </button>
          <button onClick={() => handleOpenChange(false)} className='rounded-[12px] bg-surface-3 px-4 py-3 font-bold text-white transition hover:bg-elevated'>
            {t?.close ?? 'Close'}
          </button>
        </div>
      </div>
    </DialogWrapper>
  );
};

export default ProfileDialog;
