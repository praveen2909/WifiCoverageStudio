import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function isIpv4Address(value) {
  const octets = value.split('.');
  return octets.length === 4 && octets.every((octet) => {
    const number = Number(octet);
    return /^\d{1,3}$/.test(octet) && number >= 0 && number <= 255;
  });
}

export function parseDefaultGateway(output) {
  const gateway = output.match(/^\s*gateway:\s*(\S+)\s*$/m)?.[1];
  return gateway && isIpv4Address(gateway) ? gateway : null;
}

export async function getRouterInfo(platform = process.platform) {
  if (platform !== 'darwin') {
    return {
      routerIp: null,
      routerIpError: 'Gateway IP detection is currently supported on macOS only.',
    };
  }

  try {
    const { stdout } = await execFileAsync(
      '/sbin/route',
      ['-n', 'get', '-inet', 'default'],
      { encoding: 'utf8', timeout: 2000 },
    );
    const routerIp = parseDefaultGateway(stdout);
    if (!routerIp) {
      return { routerIp: null, routerIpError: 'Could not determine the local gateway IP.' };
    }

    return { routerIp, routerIpError: null };
  } catch (error) {
    console.error('Could not determine the local gateway IP:', error);
    return { routerIp: null, routerIpError: 'Could not determine the local gateway IP.' };
  }
}
