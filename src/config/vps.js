const VPS_CONFIGS = [
  {
    id: 1,
    name: 'VPS 4 Core 8GB',
    specs: {
      cpu: 4,
      ram: 6,
      storage: 140
    }
  },
  {
    id: 2,
    name: 'VPS 2 Core 4GB',
    specs: {
      cpu: 2,
      ram: 2,
      storage: 70
    }
  }
];

const INSTALLATION_COST = 1000; // 1k per installation

module.exports = {
  VPS_CONFIGS,
  INSTALLATION_COST
};