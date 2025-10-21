#!/bin/bash
# 在有网络的机器上下载并导出 Coze 所需的所有 Docker 镜像

IMAGES=(
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

OUTPUT_DIR="./coze_images"
mkdir -p "$OUTPUT_DIR"

echo "========================================="
echo "  Coze 镜像下载和导出工具"
echo "========================================="
echo ""

for image in "${IMAGES[@]}"; do
    echo "----------------------------------------"
    echo "处理: $image"
    
    # 先拉取镜像
    if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${image}$"; then
        echo "  正在下载..."
        docker pull "$image" || { echo "  下载失败，跳过"; continue; }
    else
        echo "  本地已存在"
    fi
    
    # 导出镜像
    filename=$(echo "$image" | tr ':/' '_').tar
    echo "  导出到: $OUTPUT_DIR/$filename"
    docker save -o "$OUTPUT_DIR/$filename" "$image"
    
    # 显示文件大小
    size=$(du -h "$OUTPUT_DIR/$filename" | cut -f1)
    echo "  文件大小: $size"
done

echo ""
echo "========================================="
echo "导出完成！"
echo "镜像文件位于: $OUTPUT_DIR/"
echo ""
echo "总大小:"
du -sh "$OUTPUT_DIR"
echo ""
echo "请将 $OUTPUT_DIR 目录复制到目标服务器，然后运行:"
echo "  sudo ./import_images.sh"
echo "========================================="

