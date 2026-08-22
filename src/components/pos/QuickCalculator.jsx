import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// A lightweight calculator for quick math at the till without leaving the POS page.
export default function QuickCalculator({ open, onClose }) {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [waiting, setWaiting] = useState(false);

  const inputDigit = (d) => {
    if (waiting) {
      setDisplay(d);
      setWaiting(false);
    } else {
      setDisplay(display === "0" ? d : display + d);
    }
  };

  const inputDecimal = () => {
    if (waiting) {
      setDisplay("0.");
      setWaiting(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clearAll = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setWaiting(false);
  };

  const toggleSign = () => setDisplay(String(parseFloat(display) * -1));

  const percent = () => setDisplay(String(parseFloat(display) / 100));

  const compute = (a, b, operator) => {
    switch (operator) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? 0 : a / b;
      default: return b;
    }
  };

  const handleOp = (nextOp) => {
    const current = parseFloat(display);
    if (prev === null) {
      setPrev(current);
    } else if (op && !waiting) {
      const result = compute(prev, current, op);
      setDisplay(String(+result.toFixed(4)));
      setPrev(result);
    }
    setOp(nextOp);
    setWaiting(true);
  };

  const equals = () => {
    if (op !== null && prev !== null) {
      const current = parseFloat(display);
      const result = compute(prev, current, op);
      setDisplay(String(+result.toFixed(4)));
      setPrev(null);
      setOp(null);
      setWaiting(true);
    }
  };

  const Key = ({ label, onClick, variant = "outline", className = "" }) => (
    <Button
      variant={variant}
      onClick={onClick}
      className={`h-14 text-lg font-semibold rounded-lg ${className}`}
    >
      {label}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xs p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base font-mono">Quick Calculator</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-4 space-y-3">
          <div className="bg-slate-900 text-white text-right text-3xl font-mono p-4 rounded-lg overflow-x-auto min-h-[64px] flex items-center justify-end">
            {display}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Key label="C" onClick={clearAll} variant="secondary" />
            <Key label="±" onClick={toggleSign} variant="secondary" />
            <Key label="%" onClick={percent} variant="secondary" />
            <Key label="÷" onClick={() => handleOp("÷")} className="bg-blue-100 text-blue-700 hover:bg-blue-200" />

            <Key label="7" onClick={() => inputDigit("7")} />
            <Key label="8" onClick={() => inputDigit("8")} />
            <Key label="9" onClick={() => inputDigit("9")} />
            <Key label="×" onClick={() => handleOp("×")} className="bg-blue-100 text-blue-700 hover:bg-blue-200" />

            <Key label="4" onClick={() => inputDigit("4")} />
            <Key label="5" onClick={() => inputDigit("5")} />
            <Key label="6" onClick={() => inputDigit("6")} />
            <Key label="-" onClick={() => handleOp("-")} className="bg-blue-100 text-blue-700 hover:bg-blue-200" />

            <Key label="1" onClick={() => inputDigit("1")} />
            <Key label="2" onClick={() => inputDigit("2")} />
            <Key label="3" onClick={() => inputDigit("3")} />
            <Key label="+" onClick={() => handleOp("+")} className="bg-blue-100 text-blue-700 hover:bg-blue-200" />

            <Key label="0" onClick={() => inputDigit("0")} className="col-span-2" />
            <Key label="." onClick={inputDecimal} />
            <Key label="=" onClick={equals} className="bg-green-600 text-white hover:bg-green-700" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}