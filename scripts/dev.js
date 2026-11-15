const os = require('os');
const { spawn } = require('child_process');

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ iface: name, ip: net.address });
      }
    }
  }
  return addresses;
}

const localIps = getLocalIpAddresses();
const port = process.env.PORT || 3000;

console.log('\n======================================================');
console.log('🐾  StrayBuddy Mobile Dev Server Starting...  🐾');
console.log('======================================================');
console.log(`🌐 Local:            http://localhost:${port}`);
if (localIps.length > 0) {
  localIps.forEach(({ iface, ip }) => {
    console.log(`📱 Mobile (Phone):   http://${ip}:${port}  [${iface}]`);
  });
} else {
  console.log(`📱 Mobile (Phone):   http://<YOUR-IP>:${port}`);
}
console.log('💡 Tip: Make sure your phone is connected to the same Wi-Fi!');
console.log('======================================================\n');

// Use next binary directly via node
const nextBin = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, 'dev', '-H', '0.0.0.0', '-p', String(port)], {
  stdio: 'inherit',
});

child.on('close', (code) => {
  process.exit(code || 0);
});
