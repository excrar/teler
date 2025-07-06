const { Client } = require('ssh2');

async function checkKVMSupport(host, username, password, onLog) {
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
          output += data;
          onLog && onLog(data.toString());
        });

        stream.stderr.on('data', (data) => {
          onLog && onLog(data.toString());
        });
        
        stream.on('close', (code) => {
          conn.end();
          if (code !== 0) {
            reject(new Error('Command failed with code ' + code));
            return;
          }
          resolve(output.includes('KVM acceleration can be used'));
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
      readyTimeout: 30000,
      tryKeyboard: false
    });
  });
}

async function installRDP(host, username, password, config, onLog) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      const isArm = config.isArm;
      const supportsKvm = config.supportsKvm;
      
      let scriptUrl;
      if (isArm) {
        scriptUrl = supportsKvm ? 'https://reemote.biz.id/arm.sh' : 'https://reemote.biz.id/armn.sh';
      } else {
        scriptUrl = supportsKvm ? 'https://reemote.biz.id/rdp.sh' : 'https://reemote.biz.id/rdpn.sh';
      }

      const command = `wget -O rdp.sh ${scriptUrl} && chmod +x rdp.sh && bash rdp.sh << EOF
${config.windowsId}
${config.ram}
${config.cpu}
${config.storage}
${config.password}
EOF
history -c && history -w && rm -f rdp.sh`;

      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }

        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += 5;
          if (progress <= 100) {
            onLog && onLog(`Setup process : [${'#'.repeat(progress/2)}${' '.repeat(50-progress/2)}] ${progress}%`);
          } else {
            clearInterval(progressInterval);
          }
        }, 3000);

        stream.on('data', (data) => {
          onLog && onLog(data.toString());
        });

        stream.stderr.on('data', (data) => {
          onLog && onLog(data.toString());
        });
        
        stream.on('close', (code) => {
          clearInterval(progressInterval);
          conn.end();
          if (code !== 0) {
            reject(new Error('Installation failed with code ' + code));
            return;
          }
          resolve(true);
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
      readyTimeout: 30000,
      tryKeyboard: false
    });
  });
}

module.exports = {
  checkKVMSupport,
  installRDP
};