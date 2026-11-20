import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRouterInfo, parseDefaultGateway } from './router-info.mjs';

describe('parseDefaultGateway', () => {
  it('extracts a valid IPv4 gateway from the macOS route output', () => {
    assert.equal(
      parseDefaultGateway('route to: default\n   gateway: 192.168.1.1\n interface: en0\n'),
      '192.168.1.1',
    );
  });

  it('rejects missing and malformed gateway addresses', () => {
    assert.equal(parseDefaultGateway('route to: default\n interface: en0\n'), null);
    assert.equal(parseDefaultGateway('gateway: 999.168.1.1'), null);
    assert.equal(parseDefaultGateway('gateway: fe80::1'), null);
  });
});

describe('getRouterInfo', () => {
  it('reports unsupported platforms rather than inventing a gateway', async () => {
    assert.deepEqual(await getRouterInfo('linux'), {
      routerIp: null,
      routerIpError: 'Gateway IP detection is currently supported on macOS only.',
    });
  });
});
