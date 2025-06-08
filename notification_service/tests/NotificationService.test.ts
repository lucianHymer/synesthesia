import { NotificationService } from '../src/services/NotificationService';
import { PatternLibrary } from '../src/patterns/PatternLibrary';
import { DeviceManager } from '../src/device/DeviceManager';
import { NotificationRequest } from '../src/types';

jest.mock('../src/device/DeviceManager');
jest.mock('../src/encoder/encoderIntegration');

const MockedDeviceManager = DeviceManager as jest.MockedClass<typeof DeviceManager>;
const mockEncodeAnimation = require('../src/encoder/encoderIntegration').encodeAnimation as jest.MockedFunction<any>;

describe('NotificationService', () => {
  let service: NotificationService;
  let patternLibrary: PatternLibrary;
  let deviceManager: jest.Mocked<DeviceManager>;

  beforeEach(() => {
    patternLibrary = new PatternLibrary();
    deviceManager = new MockedDeviceManager() as jest.Mocked<DeviceManager>;
    service = new NotificationService(patternLibrary, deviceManager);

    mockEncodeAnimation.mockReturnValue(new Uint8Array([1, 2, 3, 4]));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should handle valid notification request', async () => {
    deviceManager.hasConnectedDevices.mockReturnValue(true);
    deviceManager.sendToAllDevices.mockResolvedValue([{
      status: 'playing',
      started_at: '2025-06-07T14:30:15Z'
    }]);

    const request: NotificationRequest = { pattern_id: 'gentle_success_v3' };
    const response = await service.handleNotification(request);

    expect(response.status).toBe('success');
    expect(response.pattern_used).toBe('gentle_success_v3');
    expect(response.started_at).toBeDefined();
    expect(deviceManager.sendToAllDevices).toHaveBeenCalledWith(new Uint8Array([1, 2, 3, 4]));
  });

  test('should use fallback pattern when pattern not found', async () => {
    deviceManager.hasConnectedDevices.mockReturnValue(true);
    deviceManager.sendToAllDevices.mockResolvedValue([{
      status: 'playing',
      started_at: '2025-06-07T14:30:15Z'
    }]);

    const request: NotificationRequest = { pattern_id: 'non_existent_pattern' };
    const response = await service.handleNotification(request);

    expect(response.status).toBe('success');
    expect(response.pattern_used).toBe('default_notification_v1');
  });

  test('should return error when no devices connected', async () => {
    deviceManager.hasConnectedDevices.mockReturnValue(false);

    const request: NotificationRequest = { pattern_id: 'gentle_success_v3' };
    const response = await service.handleNotification(request);

    expect(response.status).toBe('error');
    expect(response.error).toBe('device_offline');
  });

  test('should return error when device communication fails', async () => {
    deviceManager.hasConnectedDevices.mockReturnValue(true);
    deviceManager.sendToAllDevices.mockRejectedValue(new Error('Connection failed'));

    const request: NotificationRequest = { pattern_id: 'gentle_success_v3' };
    const response = await service.handleNotification(request);

    expect(response.status).toBe('error');
    expect(response.error).toBe('device_offline');
  });

  test('should return error when all devices fail to play', async () => {
    deviceManager.hasConnectedDevices.mockReturnValue(true);
    deviceManager.sendToAllDevices.mockResolvedValue([{
      status: 'error',
      error: 'invalid_data'
    }]);

    const request: NotificationRequest = { pattern_id: 'gentle_success_v3' };
    const response = await service.handleNotification(request);

    expect(response.status).toBe('error');
    expect(response.error).toBe('device_offline');
  });

  test('should increment usage count for used pattern', async () => {
    deviceManager.hasConnectedDevices.mockReturnValue(true);
    deviceManager.sendToAllDevices.mockResolvedValue([{
      status: 'playing',
      started_at: '2025-06-07T14:30:15Z'
    }]);

    const initialPattern = patternLibrary.getPattern('gentle_success_v3');
    const initialUsageCount = initialPattern!.metadata.usage_count;

    const request: NotificationRequest = { pattern_id: 'gentle_success_v3' };
    await service.handleNotification(request);

    const updatedPattern = patternLibrary.getPattern('gentle_success_v3');
    expect(updatedPattern!.metadata.usage_count).toBe(initialUsageCount + 1);
  });

  test('should handle encoding errors', async () => {
    deviceManager.hasConnectedDevices.mockReturnValue(true);
    mockEncodeAnimation.mockImplementation(() => {
      throw new Error('Encoding failed');
    });

    const request: NotificationRequest = { pattern_id: 'gentle_success_v3' };
    const response = await service.handleNotification(request);

    expect(response.status).toBe('error');
    expect(response.error).toBe('encoding_error');
  });
});