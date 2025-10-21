#!/bin/bash
# 导入 Coze 所需的所有 Docker 镜像

IMAGE_DIR="./coze_images"

if [ ! -d "$IMAGE_DIR" ]; then
    echo "错误: 镜像目录 $IMAGE_DIR 不存在"
    exit 1
fi

echo "开始导入镜像..."
for tarfile in "$IMAGE_DIR"/*.tar; do
    if [ -f "$tarfile" ]; then
        echo "导入 $tarfile"
        docker load -i "$tarfile"
    fi
done

echo "镜像导入完成！"
docker images

