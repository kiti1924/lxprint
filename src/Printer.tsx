import { use, useState } from "react";
import "core-js/proposals/array-buffer-base64";

import { type PrinterStatus } from "./lib/printer.ts";
import { drivers } from "./lib/drivers.ts";
import { PrinterContext } from "./context.tsx";
import { type LXPrinterStatus } from "./lib/lxprinter.ts";
import { type YHKPrinterStatus } from "./lib/yhkprinter.ts";

function Battery({ level, charging }: { level?: number; charging?: boolean }) {
  return (
    <>
      <svg height={12} width={30}>
        <rect
          x={0}
          y={0}
          width={25}
          height={12}
          style={{ fill: "none", strokeWidth: "2", stroke: "black" }}
        />
        <rect
          x={26}
          y={3}
          width={2}
          height={6}
          style={{ fill: "black", stroke: "none" }}
        />
        <rect
          x={1}
          y={1}
          height={10}
          width={level ? (23 * level) / 100 : 0}
          style={{
            fill: level && level > 20 ? "green" : "red",
            stroke: "none",
          }}
        />
      </svg>
      <span>{charging ? "⚡" : level}</span>
    </>
  );
}

function ConnectedState({ state }: { state?: string }) {
  const { t } = use(PrinterContext);
  switch (state) {
    case "connected":
      return `✔️ ${t('connected')}`;
    case "connecting":
      return `🛜 ${t('connecting')}`;
    case "printing":
      return `🖨️ ${t('printing')}`;
    default:
      return `🚫 ${t('disconnected')}`;
  }
}

function DriverSelect({
  driver,
  setDriver,
}: {
  driver: string;
  setDriver: (x: string) => void;
}) {
  return (
    <select value={driver} onChange={(e) => setDriver(e.target.value)} style={{ padding: '4px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white' }}>
      {drivers().map((x) => (
        <option value={x} key={x}>
          {x}
        </option>
      ))}
    </select>
  );
}

function ConnectButton({
  state,
  connect,
  disconnect,
}: {
  state?: string;
  connect: (driver: string) => void;
  disconnect: () => void;
}) {
  const [driver, setDriver] = useState(drivers()[0]);
  const { t } = use(PrinterContext);

  if (state && ["connected", "connecting", "printing"].includes(state))
    return (
      <div>
        <button onClick={disconnect} className="disconnect-button">{t('disconnect')}</button>
      </div>
    );

  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      <DriverSelect driver={driver} setDriver={setDriver} />
      <button onClick={() => connect(driver)} className="connect-button">{t('connect')}</button>
    </div>
  );
}

function LXPrinter({ status }: { status: LXPrinterStatus }) {
  const { t } = use(PrinterContext);
  return (
    <>
      <div style={{ float: "left", padding: "5px" }}>
        <Battery level={status.battery} charging={status.charging} />
      </div>
      {status.noPaper ? <div>⚠️ {t('noPaper')}</div> : <></>}
      {status.lowBatt ? <div>⚠️ {t('lowBattery')}</div> : <></>}
      {status.overheat ? <div>⚠️ {t('overheat')}</div> : <></>}
    </>
  );
}

function YHKPrinter({ status }: { status: YHKPrinterStatus }) {
  return (
    <>
      <div style={{ float: "left", padding: "5px" }}>
        <Battery level={status.battery} />
      </div>
      <div>{status.voltage}mV</div>
    </>
  );
}

function Status({
  driver,
  status,
}: {
  driver?: string;
  status: PrinterStatus;
}) {
  switch (driver) {
    case "lx":
      return <LXPrinter status={status} />;
    case "yhk":
      return <YHKPrinter status={status} />;
    default:
      return;
  }
}

function Printer() {
  const { printer, printerStatus, errors, connect, t } = use(PrinterContext);

  const disconnect = async () => {
    return await printer?.disconnect();
  };

  return (
    <>
      <div className="printer-status-area">
        <div className="printer-controls">
          <ConnectButton
            state={printerStatus?.state}
            connect={connect}
            disconnect={disconnect}
          />
        </div>
        <div className="printer-info">
          <ConnectedState state={printerStatus.state} />
          {" "}
          {printer?.name || t('noPrinter')}
        </div>
        <Status driver={printer?.driverName} status={printerStatus} />
        {errors.map((x) => (
          <div>⚠️ {x}</div>
        ))}
      </div>
    </>
  );
}

export default Printer;
