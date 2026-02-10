import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { Email } from '@/lib/types';

export function useEmailDetail(emailId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ data: Email }>(
    emailId ? `/api/emails/${emailId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    email: data?.data,
    isLoading,
    isError: error,
    mutate,
  };
}
