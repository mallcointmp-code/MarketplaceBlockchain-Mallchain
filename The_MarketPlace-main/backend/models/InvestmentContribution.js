const mongoose = require("mongoose");
mongoose.Schema({
    investmentId:{ type:
mongoose.Schema. Types.objective, ref:
 "Investment" },
 userId: {type: 
mongoose.Schema.Types.objective, ref:
  "User"
 },
 amount: Number,
 walletType: {type: string, enum:
    ["Mallmoney", "Mallcoins"], default: "Mallmoney"
 },
 status: {type: string, enum: ["pending", "No Active Investment",  "active","completed","refunded", ], default: "No Active Investment"}
}, {timestamp: true });
module.exports =
mongoose.model("InvestmentContribution" ,
InvestmentmentContributionSchema
);