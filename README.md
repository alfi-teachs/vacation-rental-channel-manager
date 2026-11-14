# E-12-LAB-EC2-AMI-Backup-Restore-
This project demonstrates how to create an Amazon EC2 instance, configure a web server, generate an Amazon Machine Image (AMI) as a backup, and launch a new instance from that AMI.


# 🎯 Objectives
Launch EC2 instance (t2.micro)
Install and configure Apache (httpd)
Create sample files
Create AMI (backup of instance)
Launch a new EC2 instance from AMI
Verify data and configuration persistence

# 🏗️ Architecture
```bash

EC2 (t2.micro)
   │
   ├── Apache Installed
   ├── Test Files Created
   │
   ▼
AMI (Backup Image)
   │
   ▼
EC2 (t3.micro from AMI)


```

# ⚙️ Prerequisites
AWS Account
Key Pair (ssh22.pem)
Basic knowledge of SSH

# Step 1: Launch EC2 Instance

- Name: web-server-1
- AMI: Amazon Linux 2
-  Instance Type: t2.micro
-  Key Pair: ssh22
-  Security Group: Allow SSH (22) and HTTP (80)

# Step 2: Connect to EC2

```bash 
ssh -i ssh22.pem ec2-user@<Public-IP>

```

```bash

sudo su

```
# Step 3: Install Apache Web Server
```bash
yum install httpd -y
```

```bash
sysystemctl start httpd
```


```bash
systemctl start httpd
```

```bash
systemctl enable httpd
```
# Step 4: Create Sample Files

```bash
cd /var/www/html
```

# ADD HTML CONTENT

```bash
vi index.html 
```

```bash
touch file{1..10}
```

```bash
ls
```

# Step 5: Create AMI (Backup)


- EC2 → Instances → Select web-server-1
-  Actions → Image → Create Image
- Name: web-server-ami
- Wait until AMI status = Available

# Step 6: Stop Original Instance
EC2 → Instances → Select web-server-1 → Stop

# Step 7: Launch New Instance from AMI
- EC2 → AMIs → Select web-server-ami → Launch Instance
- Name: web-server-2
- Instance Type: t3.micro
-  Key Pair: ssh22
-  Security Group: Allow SSH (22) and HTTP (80)

  # Step 8: Connect to New Instance
  
  ```bash 
  ssh -i ssh22.pem ec2-user@<New-Public-IP>

```

```bash
sudo su

```

# Step 9: Verify Apache Service

```bash

systemctl status httpd

```

# Step 10: Verify Files

```bash

cd /var/www/html

```

```bash
ls

```

# Expected Output

file1 file2 file3 file4 file5 file6 file7 file8 file9 file10

# 🌐 Testing (Optional)

Open browser:

``` bash
http://<New-Public-IP>

```

# 🧠 Key Learnings
AMI acts as a full backup of EC2 instance
It includes:
Operating System
Installed packages (Apache)
Files and configurations
You can launch multiple identical instances using the same AMI
Useful for:
Disaster Recovery
Auto Scaling
Environment replication


# ⭐ Final Thoughts

This lab reflects a real-world cloud practice where systems are not rebuilt manually but replicated using images. It’s a foundational concept behind scalable and reliable cloud infrastructure.





