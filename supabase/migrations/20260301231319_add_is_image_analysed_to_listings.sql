-- Add is_image_analysed column to listings table
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS is_image_analysed BOOLEAN DEFAULT false;

-- Add comment to the column
COMMENT ON COLUMN public.listings.is_image_analysed IS 'Indicates whether the listing image has been analysed by the AI vision model';
