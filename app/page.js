export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24, lineHeight: 1.6 }}>
      <h1 style={{ margin: "0 0 12px" }}>Transit Server</h1>
      <p style={{ margin: "0 0 8px" }}>POST /robot/voiceMonitor</p>
      <p style={{ margin: "0 0 8px" }}>POST /robot/listenQwen</p>
      <p style={{ margin: "16px 0 0", color: "#555" }}>
        这是一个用于接收机器人请求的中转服务。
      </p>
    </main>
  );
}
