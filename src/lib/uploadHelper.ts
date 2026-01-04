import * as tus from 'tus-js-client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

export interface UploadResult {
  success: boolean;
  error?: string;
}

// Get the direct storage endpoint for better performance
function getStorageEndpoint(): string {
  // Use direct storage hostname for performance
  if (PROJECT_ID) {
    return `https://${PROJECT_ID}.storage.supabase.co`;
  }
  // Fallback to standard URL
  return SUPABASE_URL;
}

/**
 * Upload a file with progress tracking using TUS resumable uploads
 * This handles large files (up to 1GB) reliably with resume capability
 */
export function uploadFileWithProgress(
  file: File,
  bucketName: string,
  filePath: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const storageEndpoint = getStorageEndpoint();
    
    const upload = new tus.Upload(file, {
      endpoint: `${storageEndpoint}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucketName,
        objectName: filePath,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024, // Must be 6MB for Supabase
      onError: (error) => {
        console.error('Upload error:', error);
        resolve({ success: false, error: error.message || 'Upload failed' });
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        if (onProgress) {
          const percent = (bytesUploaded / bytesTotal) * 100;
          onProgress(percent);
        }
      },
      onSuccess: () => {
        resolve({ success: true });
      },
    });

    // Check for previous uploads to resume
    upload.findPreviousUploads().then((previousUploads) => {
      // If there was a previous incomplete upload, resume it
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      
      // Start the upload
      upload.start();
    });
  });
}
