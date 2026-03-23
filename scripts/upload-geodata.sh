#!/bin/bash
set -e

# Load .env if exists
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Defaults
SMB_SERVER=${SMB_SERVER:-"enac-nas1.rcp.epfl.ch"}
SMB_SHARE=${SMB_SHARE:-"fts-enac-it"}
SMB_PATH=${SMB_PATH:-"urbes-viz.epfl.ch"}
SMB_USER=${SMB_USER:-$(whoami)}
SMB_MOUNT_POINT=${SMB_MOUNT_POINT:-"/tmp/urbes-smb-mount"}

# Expand ~ in mount point
SMB_MOUNT_POINT="${SMB_MOUNT_POINT/#\~/$HOME}"

echo "Uploading geodata folder to SMB share..."
echo "Server: //$SMB_SERVER/$SMB_SHARE"
echo "Remote path: $SMB_PATH"
echo "Username: $SMB_USER"
echo "Mount point: $SMB_MOUNT_POINT"
echo ""

# Create mount point
mkdir -p "$SMB_MOUNT_POINT"

# If already mounted, unmount first to ensure correct options
if mountpoint -q "$SMB_MOUNT_POINT"; then
    echo "Remounting with correct permissions..."
    sudo umount "$SMB_MOUNT_POINT"
fi

echo "Mounting SMB share... (enter passwords when prompted)"
sudo mount.cifs "//$SMB_SERVER/$SMB_SHARE" "$SMB_MOUNT_POINT" \
    -o "username=$SMB_USER,domain=INTRANET,uid=$(id -u),gid=$(id -g),file_mode=0664,dir_mode=0775"
echo "✓ Mounted at $SMB_MOUNT_POINT"
echo ""

# The target directory is SMB_PATH inside the mounted share
TARGET_DIR="$SMB_MOUNT_POINT/$SMB_PATH"
if [ ! -d "$TARGET_DIR" ]; then
    echo "✗ Error: directory '$TARGET_DIR' not found on the share."
    echo "  Check that SMB_PATH=$SMB_PATH exists on the NAS."
    sudo umount "$SMB_MOUNT_POINT" 2>/dev/null || true
    exit 1
fi

# Sync files to the geodata/ subdirectory
DEST="$TARGET_DIR/geodata"
mkdir -p "$DEST"

echo "Syncing files with rsync..."
rsync -rlvc --no-times --progress frontend/public/geodata/ "$DEST/"

echo ""
echo "✓ Files uploaded successfully"
echo ""

# Unmount
echo "Unmounting SMB share... (enter sudo password if prompted)"
sudo umount "$SMB_MOUNT_POINT"

echo "✓ Upload complete!"
echo "Files are now available at https://urbes-viz.epfl.ch/geodata/"
