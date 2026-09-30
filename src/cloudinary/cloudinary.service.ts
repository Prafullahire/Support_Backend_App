import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  originalFilename: string;
  resourceType: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  folder: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly configured: boolean;

  constructor(private config: ConfigService) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    this.configured = Boolean(cloudName && apiKey && apiSecret);

    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.logger.log('Cloudinary configured successfully.');
    } else {
      this.logger.warn(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }
  }

  isConfigured() {
    return this.configured;
  }

  /**
   * Upload a buffer to Cloudinary and return the secure URL.
   */
  async uploadBuffer(
    buffer: Buffer,
    options: {
      folder: string;
      filename?: string;
      mimeType?: string;
    },
  ): Promise<string> {
    const result = await this.uploadBufferFull(buffer, options);
    return result.secureUrl;
  }

  /**
   * Upload a buffer to Cloudinary and return full metadata.
   */
  async uploadBufferFull(
    buffer: Buffer,
    options: {
      folder: string;
      filename?: string;
      mimeType?: string;
    },
  ): Promise<CloudinaryUploadResult> {
    this.assertConfigured();

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          public_id: options.filename,
          resource_type: 'auto',
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }
          resolve(uploadResult);
        },
      );

      upload.end(buffer);
    });

    return this.mapResult(result);
  }

  /**
   * Upload a base64 data URL image to Cloudinary.
   */
  async uploadBase64Image(
    dataUrl: string,
    folder: string,
    publicId?: string,
  ): Promise<string> {
    this.assertConfigured();

    if (!dataUrl.startsWith('data:image/')) {
      throw new BadRequestException('Photo must be a valid image data URL');
    }

    const result = await cloudinary.uploader.upload(dataUrl, {
      folder,
      public_id: publicId,
      resource_type: 'image',
      overwrite: true,
    });

    return result.secure_url;
  }

  /**
   * Delete a file from Cloudinary by its public_id.
   */
  async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<void> {
    this.assertConfigured();

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      this.logger.log(`Deleted Cloudinary asset: ${publicId}`);
    } catch (err) {
      this.logger.error(`Failed to delete Cloudinary asset ${publicId}`, err);
      throw err;
    }
  }

  /**
   * Delete multiple files from Cloudinary by their public_ids.
   */
  async deleteFiles(publicIds: string[]): Promise<void> {
    this.assertConfigured();
    if (!publicIds.length) return;

    try {
      await cloudinary.api.delete_resources(publicIds);
      this.logger.log(`Deleted ${publicIds.length} Cloudinary assets`);
    } catch (err) {
      this.logger.error('Failed to bulk-delete Cloudinary assets', err);
      throw err;
    }
  }

  private mapResult(result: UploadApiResponse): CloudinaryUploadResult {
    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      originalFilename: result.original_filename,
      resourceType: result.resource_type,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      folder: result.folder ?? '',
    };
  }

  private assertConfigured() {
    if (!this.configured) {
      throw new BadRequestException(
        'Cloudinary is not configured on the server. Contact your administrator.',
      );
    }
  }
}
