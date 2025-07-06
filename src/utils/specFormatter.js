// Format VPS specifications by rounding up values
function roundUpSpecs(specs) {
  return {
    // Round up CPU cores to nearest whole number
    cpu: Math.ceil(specs.cpu),
    
    // Round up RAM to nearest GB
    ram: Math.ceil(specs.ram),
    
    // Round up storage to nearest 10GB
    storage: Math.ceil(specs.storage / 10) * 10
  };
}

module.exports = {
  roundUpSpecs
};