import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3StorageService } from '../src/modules/storage/s3-storage.service';

const mockSend = jest.fn();

// Real Command classes (PutObjectCommand, etc.) are kept — they're plain
// data-holding wrappers, so inspecting `.input` on whatever was passed to
// `send` tells us exactly what key/bucket S3StorageService built, without
// a real network call. Only the client's `send` method is replaced.
jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return { ...actual, S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })) };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn() }));

const mockPresign = getSignedUrl as jest.Mock;

describe('S3StorageService', () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockPresign.mockReset();
  });

  function makeService() {
    return new S3StorageService({ bucket: 'test-bucket', region: 'ap-south-1', accessKeyId: 'AKIA', secretAccessKey: 'secret' });
  }

  describe('upload', () => {
    it('scopes the key under tenants/{tenantId}/{category}/{entityId}/', async () => {
      mockSend.mockResolvedValue({});
      const storage = makeService();

      const { key } = await storage.upload({
        buffer: Buffer.from('x'),
        tenantId: 'tenant-a',
        category: 'inspection-photo',
        entityId: 'insp-42',
        filename: 'photo.jpg',
      });

      expect(key).toMatch(/^tenants\/tenant-a\/inspection-photo\/insp-42\/[0-9a-f-]+\.jpg$/);
      const command = mockSend.mock.calls[0][0] as PutObjectCommand;
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input.Bucket).toBe('test-bucket');
      expect(command.input.Key).toBe(key);
    });

    it('omits the entity segment when there is no owning entity (e.g. a workshop logo)', async () => {
      mockSend.mockResolvedValue({});
      const storage = makeService();

      const { key } = await storage.upload({ buffer: Buffer.from('x'), tenantId: 'tenant-a', category: 'workshop-logo', filename: 'logo.png' });

      expect(key).toMatch(/^tenants\/tenant-a\/workshop-logo\/[0-9a-f-]+\.png$/);
    });

    it('never lets one tenant\'s key collide with another\'s, even for the same category/filename', async () => {
      mockSend.mockResolvedValue({});
      const storage = makeService();

      const a = await storage.upload({ buffer: Buffer.from('x'), tenantId: 'tenant-a', category: 'vehicle-photo', entityId: 'v1', filename: 'photo.jpg' });
      const b = await storage.upload({ buffer: Buffer.from('x'), tenantId: 'tenant-b', category: 'vehicle-photo', entityId: 'v1', filename: 'photo.jpg' });

      expect(a.key).not.toBe(b.key);
      expect(a.key.startsWith('tenants/tenant-a/')).toBe(true);
      expect(b.key.startsWith('tenants/tenant-b/')).toBe(true);
    });
  });

  describe('getSignedUrl', () => {
    it('requests a 15-minute (900s) expiry', async () => {
      mockPresign.mockResolvedValue('https://signed.example/object');
      const storage = makeService();

      const url = await storage.getSignedUrl('tenants/tenant-a/vehicle-photo/v1/abc.jpg');

      expect(url).toBe('https://signed.example/object');
      expect(mockPresign).toHaveBeenCalledTimes(1);
      const [, command, options] = mockPresign.mock.calls[0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input).toMatchObject({ Bucket: 'test-bucket', Key: 'tenants/tenant-a/vehicle-photo/v1/abc.jpg' });
      expect(options).toEqual({ expiresIn: 900 });
    });
  });

  describe('delete', () => {
    it('sends a DeleteObjectCommand for the given key', async () => {
      mockSend.mockResolvedValue({});
      const storage = makeService();

      await storage.delete('tenants/tenant-a/vehicle-photo/v1/abc.jpg');

      const command = mockSend.mock.calls[0][0] as DeleteObjectCommand;
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input).toMatchObject({ Bucket: 'test-bucket', Key: 'tenants/tenant-a/vehicle-photo/v1/abc.jpg' });
    });

    it('treats an already-missing object as success, not an error', async () => {
      mockSend.mockRejectedValue(Object.assign(new Error('not found'), { name: 'NoSuchKey' }));
      const storage = makeService();

      await expect(storage.delete('tenants/tenant-a/vehicle-photo/v1/gone.jpg')).resolves.toBeUndefined();
    });

    it('rethrows any other error', async () => {
      mockSend.mockRejectedValue(new Error('network blip'));
      const storage = makeService();

      await expect(storage.delete('tenants/tenant-a/vehicle-photo/v1/x.jpg')).rejects.toThrow('network blip');
    });
  });
});
