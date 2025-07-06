const { Client } = require('ssh2');

async function checkVPSSupport(host, username, password) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      conn.exec('sudo apt install cpu-checker -y && sudo kvm-ok', (err, stream) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }
        
        let output = '';
        stream.on('data', (data) => {
          output += data.toString();
        });
        
        stream.on('close', (code) => {
          conn.end();
          if (code !== 0) {
            reject(new Error('Command failed'));
            return;
          }
          resolve({
            supported: output.includes('KVM acceleration can be used'),
            output
          });
        });
      });
    });

    conn.on('error', (err) => {
      reject(err);
    });

    conn.connect({
      host,
      port: 22,
      username,
      password,
      readyTimeout: 30000
    });
  });
}

module.exports = {
  checkVPSSupport
};