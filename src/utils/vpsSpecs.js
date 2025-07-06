const { Client } = require('ssh2');
const { roundUpSpecs } = require('./specFormatter');

async function detectVPSSpecs(host, username, password) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      // Command to get raw CPU cores, RAM, and storage info
      const command = `
        echo "CPU=$(grep -c ^processor /proc/cpuinfo)
RAM=$(free -m | awk '/Mem:/ {printf "%.1f", $2/1024}')
STORAGE=$(df -BG --output=size / | tail -1 | tr -d 'G ')"
      `;
      
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }
        
        let output = '';
        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data) => {
          console.error('VPS Detection Error:', data.toString());
        });
        
        stream.on('close', (code) => {
          conn.end();
          if (code !== 0) {
            reject(new Error('Failed to detect VPS specifications'));
            return;
          }
          
          try {
            // Parse the raw output using regex
            const cpuMatch = output.match(/CPU=(\d+\.?\d*)/);
            const ramMatch = output.match(/RAM=(\d+\.?\d*)/);
            const storageMatch = output.match(/STORAGE=(\d+\.?\d*)/);
            
            if (!cpuMatch || !ramMatch || !storageMatch) {
              throw new Error('Failed to parse VPS specifications');
            }

            const cpu = parseFloat(cpuMatch[1]);
            const ram = parseFloat(ramMatch[1]);
            const storage = parseFloat(storageMatch[1]);

            if (isNaN(cpu) || isNaN(ram) || isNaN(storage)) {
              throw new Error('Invalid VPS specifications detected');
            }

            // Get raw specs with minimum values
            const rawSpecs = {
              cpu: Math.max(1, cpu),
              ram: Math.max(1, ram),
              storage: Math.max(20, storage)
            };
            
            // Round up the specifications
            resolve(roundUpSpecs(rawSpecs));
          } catch (error) {
            reject(new Error(`Failed to parse VPS specs: ${error.message}`));
          }
        });
      });
    });

    conn.on('error', (err) => {
      reject(new Error(`Failed to connect to VPS: ${err.message}`));
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
  detectVPSSpecs
};