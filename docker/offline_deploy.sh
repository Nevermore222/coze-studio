#!/bin/bash
# Coze Studio 离线部署脚本

set -e

IMAGE_DIR="./coze_images"
REQUIRED_IMAGES=(
    "mysql:8.4.5"
    "bitnami/redis:8.0"
    "bitnami/elasticsearch:8.18.0"
    "minio/minio:RELEASE.2025-06-13T11-33-47Z-cpuv1"
    "bitnami/etcd:3.5"
    "milvusdb/milvus:v2.5.10"
    "nsqio/nsq:v1.2.1"
    "cozedev/coze-studio-server:latest"
    "cozedev/coze-studio-web:latest"
)

echo "========================================="
echo "  Coze Studio 离线部署工具"
echo "========================================="
echo ""

# 检查本地镜像
echo "检查本地镜像..."
missing_images=()
for image in "${REQUIRED_IMAGES[@]}"; do
    if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${image}$"; then
        missing_images+=("$image")
        echo "  [缺失] $image"
    else
        echo "  [存在] $image"
    fi
done

echo ""

# 如果有缺失的镜像
if [ ${#missing_images[@]} -gt 0 ]; then
    echo "缺失 ${#missing_images[@]} 个镜像"
    echo ""
    echo "请按以下步骤操作:"
    echo "1. 在有网络的机器上运行: sudo ./export_images.sh"
    echo "2. 将生成的 coze_images 目录复制到本服务器"
    echo "3. 在本服务器运行: sudo ./import_images.sh"
    echo ""
    read -p "如果已准备好镜像文件，按回车继续导入..." 
    
    if [ -d "$IMAGE_DIR" ]; then
        echo ""
        echo "开始导入镜像..."
        for tarfile in "$IMAGE_DIR"/*.tar; do
            if [ -f "$tarfile" ]; then
                echo "导入: $(basename $tarfile)"
                docker load -i "$tarfile"
            fi
        done
    else
        echo "错误: 找不到镜像目录 $IMAGE_DIR"
        exit 1
    fi
fi

echo ""
echo "========================================="
echo "  启动 Coze Studio 服务"
echo "========================================="
echo ""

export DOCKER_BUILDKIT=0
export COMPOSE_HTTP_TIMEOUT=300

docker-compose up -d

echo ""
echo "等待服务启动..."
sleep 10

echo ""
echo "服务状态:"
docker-compose ps

echo ""
echo "========================================="
echo "部署完成!"
echo "访问地址: http://localhost:8888"
echo "========================================="

