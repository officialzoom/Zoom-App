import React from "react";
import { Transaction } from "@/lib/firebase-api";
import { formatCurrency, formatDate } from "@/lib/formatting";
import { ArrowDownLeft, ArrowUpRight, Plus, Minus } from "lucide-react";

interface TransactionItemProps {
  transaction: Transaction;
}

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const isPositive = transaction.type === "return" || transaction.type === "deposit";
  
  const getIcon = () => {
    switch (transaction.type) {
      case "return":
        return <ArrowDownLeft className="w-5 h-5 text-green-600" />;
      case "deposit":
        return <Plus className="w-5 h-5 text-blue-600" />;
      case "invest":
        return <Minus className="w-5 h-5 text-orange-600" />;
      case "withdrawal":
        return <ArrowUpRight className="w-5 h-5 text-gray-600" />;
      default:
        return <ArrowUpRight className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBgColor = () => {
    switch (transaction.type) {
      case "return": return "bg-green-100";
      case "deposit": return "bg-blue-100";
      case "invest": return "bg-orange-100";
      case "withdrawal": return "bg-gray-100";
      default: return "bg-gray-100";
    }
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getBgColor()}`}>
          {getIcon()}
        </div>
        <div>
          <p className="font-semibold text-foreground">{transaction.label}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{formatDate(transaction.date)}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span className={`text-xs font-medium capitalize ${
              transaction.status === 'completed' ? 'text-green-600' :
              transaction.status === 'pending' ? 'text-orange-500' : 'text-blue-500'
            }`}>
              {transaction.status}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold ${isPositive ? "text-green-600" : "text-foreground"}`}>
          {isPositive ? "+" : "-"}{formatCurrency(transaction.amount)}
        </p>
      </div>
    </div>
  );
}
