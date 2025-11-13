// Reference: javascript_websocket blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";
import { insertGroupSchema, insertMemberSchema, insertMemoSchema } from "@shared/schema";
import { randomBytes } from "crypto";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Groups
  app.post("/api/groups", async (req, res) => {
    try {
      const { name, memberName } = req.body;
      const inviteCode = randomBytes(6).toString("hex");
      
      const group = await storage.createGroup({ name, inviteCode });
      const member = await storage.createMember({ 
        groupId: group.id, 
        name: memberName 
      });
      
      res.json({ group, member });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/groups/join", async (req, res) => {
    try {
      const { inviteCode, memberName } = req.body;
      
      const group = await storage.getGroupByInviteCode(inviteCode);
      if (!group) {
        return res.status(404).json({ error: "그룹을 찾을 수 없습니다" });
      }
      
      const member = await storage.createMember({ 
        groupId: group.id, 
        name: memberName 
      });
      
      res.json({ group, member });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/groups", async (req, res) => {
    try {
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Memos
  app.post("/api/memos", upload.array("photos", 10), async (req, res) => {
    try {
      const { buildingName, address, latitude, longitude, content, memberId, groupId } = req.body;
      
      const memo = await storage.createMemo({
        buildingName,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        content,
        memberId,
        groupId: groupId || null,
      });

      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        for (const file of files) {
          const photoUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
          await storage.createPhoto({
            memoId: memo.id,
            url: photoUrl,
          });
        }
      }

      const memoWithDetails = await storage.getMemoById(memo.id);
      
      // Broadcast to WebSocket clients
      broadcast({ 
        type: "memo_created", 
        memo: memoWithDetails 
      });
      
      res.json(memoWithDetails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/memos", async (req, res) => {
    try {
      const memos = await storage.getMemos();
      res.json(memos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/memos/:id", async (req, res) => {
    try {
      const memo = await storage.getMemoById(req.params.id);
      if (!memo) {
        return res.status(404).json({ error: "메모를 찾을 수 없습니다" });
      }
      res.json(memo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/memos/:id", async (req, res) => {
    try {
      await storage.deleteMemo(req.params.id);
      
      // Broadcast to WebSocket clients
      broadcast({ 
        type: "memo_deleted", 
        memoId: req.params.id 
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time memo updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Set<WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    console.log('WebSocket client connected. Total clients:', clients.size);

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Broadcast to all other clients
        clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket client disconnected. Total clients:', clients.size);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  return httpServer;
}
