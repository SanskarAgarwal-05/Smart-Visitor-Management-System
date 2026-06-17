const Visitor = require('../models/Visitor');

const generateVisitorId = async () => {
  const currentYear = new Date().getFullYear();
  const yearRegex = new RegExp(`^VIS-${currentYear}-`);
  
  // Find the highest visitorId for the current year
  const lastVisitor = await Visitor.findOne(
    { visitorId: { $regex: yearRegex } },
    { visitorId: 1 },
    { sort: { visitorId: -1 } }
  );

  let nextNum = 1;
  if (lastVisitor && lastVisitor.visitorId) {
    const parts = lastVisitor.visitorId.split('-');
    if (parts.length === 3) {
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
  }

  const paddedNum = String(nextNum).padStart(3, '0');
  return `VIS-${currentYear}-${paddedNum}`;
};

module.exports = generateVisitorId;
