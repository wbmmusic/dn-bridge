import React from "react";

export default function Universe({ data }) {
  return (
    <div className="universe">
      {data.map((ch, i) => (
        <div key={"uniCh" + i} className="dmxChannel">
          <div
            className="dmxChannelValue"
            style={{ height: `${(ch * 100) / 255}%` }}
          />
        </div>
      ))}
    </div>
  );
}
