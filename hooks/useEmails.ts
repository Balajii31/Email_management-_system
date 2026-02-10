import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { Email } from '@/lib/types';

export function useEmails(params: {
  page?: number;
  limit?: number;
  priority?: string;
  isSpam?: boolean;
  search?: string;
  folder?: string;
} = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.priority) queryParams.set('priority', params.priority);
  if (params.isSpam !== undefined) queryParams.set('isSpam', params.isSpam.toString());
  if (params.search) queryParams.set('search', params.search);
  if (params.folder) queryParams.set('folder', params.folder);

  const url = `/api/emails?${queryParams.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<{
    data: Email[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>(url, fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  return {
    emails: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  };
}
