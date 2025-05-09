// src/classes/ExecutionPodAgent.ts
export class ExecutionPodAgent {
    private id: string;
    private socket: any;
  
    constructor(id: string, socket: any) {
      this.id = id;
      this.socket = socket;
  
      this.setupListeners();
    }
  
    private setupListeners() {
      // this.socket.on('ready', () => {
      //   console.log(`✅ Pod ${this.id} is ready`);
      //   // TODO: Assign task to this pod
      // });
  
      this.socket.on('task-complete', (result: any) => {
        console.log(`🎯 Pod ${this.id} completed task`, result);
        // TODO: Send next task or mark group done
      });
  
      this.socket.on('disconnect', () => {
        console.warn(`❌ Pod ${this.id} disconnected`);
        // Optional: Retry, mark pod failed, or requeue task
      });

      this.socket.on('task-log', (result:any) => {
        console.log(`📜 Pod ${this.id} log:`, JSON.stringify(result, null, 2));
        // (optional) push another task if available
      });
      this.socket.on('task-complete', (result:any) => {
        console.log(`✅ Pod ${this.id} completed:`, JSON.stringify(result, null, 2));
        // (optional) push another task if available
      });
    }
  
    public assignTask(task: any) {
      console.log(`📝 Assigning task ${task.id} to pod ${this.id}`);
      this.socket.emit('task', task);
    }
  }
  