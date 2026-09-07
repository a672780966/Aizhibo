/**
 * Host Permission — 与 DEV-053 hostMood.ts 同构的可变存储原语。
 *
 * 本模块只提供"Host 当前是否被静音、如何读取、如何被外部设置"的存储原语，
 * 零依赖、不做任何自动推导。取值只有 ALLOWED/MUTED 两个：对应 Operator
 * API 11 个 action 中的 Mute Host/Unmute Host（不复用 egressGate.ts 的
 * 三值 HostPermission——LIMITED 不在任何 action 语义内，不发明用不到的
 * 第三态）。
 */

export type HostPermissionState = 'ALLOWED' | 'MUTED';

export interface HostPermissionStore {
  /** 只读地返回当前 Host 说话许可。 */
  getPermission(): HostPermissionState;
  /** 设置新的许可（覆盖式）。 */
  setPermission(permission: HostPermissionState): void;
}

export function createHostPermissionStore(
  initial: HostPermissionState = 'ALLOWED',
): HostPermissionStore {
  let current: HostPermissionState = initial;
  return {
    getPermission() {
      return current;
    },
    setPermission(permission) {
      current = permission;
    },
  };
}
