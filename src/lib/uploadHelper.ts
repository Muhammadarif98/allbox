import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface UploadResult {
  success: boolean;
  error?: string;
}

/**
 * Upload a file with progress tracking using XMLHttpRequest
 * This bypasses the Supabase JS client timeout issues for large files
 */
export function uploadFileWithProgress(
  file: File,
  bucketName: string,
  filePath: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const url = `${SUPABASE_URL}/storage/v1/object/${bucketName}/${filePath}`;
    
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_KEY}`);
    xhr.setRequestHeader('apikey', SUPABASE_KEY);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'true');
    
    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = (event.loaded / event.total) * 100;
        onProgress(percent);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true });
      } else {
        let errorMessage = 'Upload failed';
        try {
          const response = JSON.parse(xhr.responseText);
          errorMessage = response.message || response.error || errorMessage;
        } catch {
          errorMessage = xhr.statusText || errorMessage;
        }
        resolve({ success: false, error: errorMessage });
      }
    };
    
    xhr.onerror = () => {
      resolve({ success: false, error: 'Network error during upload' });
    };
    
    xhr.ontimeout = () => {
      resolve({ success: false, error: 'Upload timed out' });
    };
    
    // No timeout for large files
    xhr.timeout = 0;
    
    xhr.send(file);
  });
}
