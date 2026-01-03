-- Increase file size limit for dialog-files bucket to 1GB (1073741824 bytes)
UPDATE storage.buckets 
SET file_size_limit = 1073741824 
WHERE id = 'dialog-files';