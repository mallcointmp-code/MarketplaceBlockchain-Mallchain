const templates = {
  productReady: ({ productName, pickupLocation }) => `Your product "${productName}" is ready for pickup at ${pickupLocation}. Thank you for shopping with us!`,
  mallpointsCredited: ({ amount, taskId }) => `You have been credited with ${amount} Mallpoints for completing task #${taskId}. Keep up the great work!`
};

export default function getWhatsAppMessage(type, details) {
  return templates[type] ? templates[type](details) : (details && details.message) || "";
}

export { templates };