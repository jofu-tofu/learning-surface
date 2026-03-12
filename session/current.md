---
version: 1
active_section: the-three-way-handshake
---

## What is TCP?

### canvas: mermaid
graph LR
  A[Application] --> B[TCP] --> C[IP] --> D[Network]

### explanation
TCP (Transmission Control Protocol) is a connection-oriented protocol that ensures reliable, ordered delivery of data between applications. It sits at the transport layer of the networking stack.

Unlike UDP, TCP guarantees that packets arrive in order and retransmits any that are lost.

### check: c1
What layer of the OSI model does TCP operate at?
<!-- status: unanswered -->

## The Three-Way Handshake

### canvas: mermaid
sequenceDiagram
  Client->>Server: SYN (seq=x)
  Server->>Client: SYN-ACK (seq=y, ack=x+1)
  Client->>Server: ACK (ack=y+1)
  Note over Client,Server: Connection established

### explanation
Before any data can flow, TCP establishes a connection using a three-step process called the **three-way handshake**:

1. **SYN** — The client sends a SYN (synchronize) packet with an initial sequence number
2. **SYN-ACK** — The server responds with its own SYN and acknowledges the client's sequence number
3. **ACK** — The client acknowledges the server's sequence number, completing the connection

This ensures both sides agree on sequence numbers and are ready to communicate reliably.

### check: c2
Why can't TCP establish a connection with just one packet?
<!-- status: unanswered -->

### followups
- What happens if the SYN packet is lost?
- What is a SYN flood attack?
- How does the connection close?
