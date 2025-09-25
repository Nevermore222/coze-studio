/*
 * Copyright 2025 coze-dev Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState, useRef } from 'react';
import {
  Modal,
  Tabs,
  Form,
  FormInput,
  FormTextArea,
  Button,
  Card,
  Upload,
  Space,
  Typography,
  Toast,
  Table,
  Checkbox,
} from '@coze-arch/coze-design';
import { IconCozUpload, IconCozRefresh } from '@coze-arch/coze-design/icons';

interface DifyApp {
  id: string;
  name: string;
  description: string;
  type: 'chat' | 'completion' | 'workflow';
  api_endpoint?: string;
}

interface DifyImportModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (apps: DifyApp[]) => void;
}

type ImportType = 'url' | 'file' | 'text';

export const DifyImportModal: React.FC<DifyImportModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [importType, setImportType] = useState<ImportType>('url');
  const [loading, setLoading] = useState(false);
  const [scannedApps, setScannedApps] = useState<DifyApp[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [formApi, setFormApi] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setScannedApps([]);
    setSelectedApps([]);
    setLoading(false);
  };

  const handleCancel = () => {
    resetState();
    onCancel();
  };

  // URL 方式扫描应用
  const scanFromUrl = async (config: { host: string; apiKey: string }) => {
    try {
      setLoading(true);
      
      // 模拟扫描结果（实际应用中调用后端 API）
      const mockApps: DifyApp[] = [
        {
          id: config.apiKey,
          name: `智能客服 (${config.host})`,
          description: `从 ${config.host} 导入的聊天应用`,
          type: 'chat',
          api_endpoint: `${config.host}/v1/chat-messages`,
        },
        {
          id: 'workflow-001',
          name: `文档处理工作流 (${config.host})`,
          description: `从 ${config.host} 导入的工作流`,
          type: 'workflow',
          api_endpoint: `${config.host}/v1/workflows/workflow-001/run`,
        },
      ];
      
      setScannedApps(mockApps);
      Toast.success({ content: `发现 ${mockApps.length} 个可导入的应用` });
    } catch (error) {
      Toast.error({ content: '扫描失败，请检查配置' });
    } finally {
      setLoading(false);
    }
  };

  // 文件方式导入
  const importFromFile = async (file: File) => {
    try {
      setLoading(true);
      const text = await file.text();
      const config = JSON.parse(text);
      
      if (config.type !== 'DIFY_EXPORT' || !config.apps) {
        throw new Error('无效的配置文件格式');
      }
      
      setScannedApps(config.apps);
      Toast.success({ content: `从文件中导入 ${config.apps.length} 个应用配置` });
    } catch (error) {
      Toast.error({ content: '文件解析失败，请检查格式' });
    } finally {
      setLoading(false);
    }
  };

  // 文本方式导入
  const importFromText = async (text: string) => {
    try {
      setLoading(true);
      const config = JSON.parse(text);
      
      if (Array.isArray(config)) {
        setScannedApps(config);
      } else if (config.apps) {
        setScannedApps(config.apps);
      } else {
        throw new Error('无效的配置格式');
      }
      
      Toast.success({ content: `解析成功，发现 ${scannedApps.length} 个应用` });
    } catch (error) {
      Toast.error({ content: '文本解析失败，请检查 JSON 格式' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (selectedApps.length === 0) {
      Toast.warning({ content: '请选择要导入的应用' });
      return;
    }

    const appsToImport = scannedApps.filter(app => selectedApps.includes(app.id));
    onSuccess(appsToImport);
    handleCancel();
  };

  const columns = [
    {
      title: '选择',
      width: 60,
      render: (_: any, record: DifyApp) => (
        <Checkbox
          checked={selectedApps.includes(record.id)}
          onChange={(checked) => {
            if (checked) {
              setSelectedApps([...selectedApps, record.id]);
            } else {
              setSelectedApps(selectedApps.filter(id => id !== record.id));
            }
          }}
        />
      ),
    },
    {
      title: '应用名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => 
        type === 'chat' ? '聊天应用' : 
        type === 'workflow' ? '工作流' : 
        type === 'completion' ? '完成应用' : type,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  const renderUrlImport = () => (
    <Form
      getFormApi={api => setFormApi(api)}
      labelPosition="left"
      labelAlign="right"
      labelWidth={100}
    >
      <FormInput
        field="host"
        label="Dify 地址"
        placeholder="https://your-dify-host.com"
        rules={[{ required: true, message: '请输入 Dify 服务地址' }]}
      />
      <FormInput
        field="apiKey"
        label="API Key"
        placeholder="app-xxxxxxxxxxxxx"
        rules={[{ required: true, message: '请输入 API Key' }]}
      />
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Button
          type="primary"
          icon={<IconCozRefresh />}
          loading={loading}
          onClick={() => {
            const values = formApi?.getValues();
            if (values?.host && values?.apiKey) {
              scanFromUrl(values);
            } else {
              Toast.warning({ content: '请填写完整的配置信息' });
            }
          }}
        >
          扫描应用
        </Button>
      </div>
    </Form>
  );

  const renderFileImport = () => (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            importFromFile(file);
          }
        }}
      />
      <Card style={{ border: '2px dashed #d9d9d9', padding: 40 }}>
        <IconCozUpload style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
        <Typography.Text>点击选择 Dify 配置文件</Typography.Text>
        <br />
        <Typography.Text type="secondary">支持 .json 格式的配置文件</Typography.Text>
        <br />
        <Button
          type="primary"
          style={{ marginTop: 16 }}
          loading={loading}
          onClick={() => fileInputRef.current?.click()}
        >
          选择文件
        </Button>
      </Card>
    </div>
  );

  const renderTextImport = () => (
    <Form labelPosition="top">
      <FormTextArea
        field="configText"
        label="配置数据"
        placeholder={`请粘贴 Dify 应用配置，格式如下：
{
  "type": "DIFY_EXPORT",
  "apps": [
    {
      "id": "app-xxxxx",
      "name": "应用名称",
      "type": "chat",
      "description": "应用描述",
      "api_endpoint": "https://dify.example.com/v1/chat-messages"
    }
  ]
}`}
        rows={10}
        rules={[{ required: true, message: '请输入配置数据' }]}
      />
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Button
          type="primary"
          loading={loading}
          onClick={() => {
            const values = formApi?.getValues();
            if (values?.configText) {
              importFromText(values.configText);
            } else {
              Toast.warning({ content: '请输入配置数据' });
            }
          }}
        >
          解析配置
        </Button>
      </div>
    </Form>
  );

  const tabItems = [
    {
      key: 'url',
      title: 'URL 扫描',
      content: renderUrlImport(),
    },
    {
      key: 'file',
      title: '文件导入',
      content: renderFileImport(),
    },
    {
      key: 'text',
      title: '文本导入',
      content: renderTextImport(),
    },
  ];

  return (
    <Modal
      visible={visible}
      onCancel={handleCancel}
      title="导入 Dify 应用"
      width={800}
      footer={
        scannedApps.length > 0 ? (
          <Space>
            <Button onClick={handleCancel}>取消</Button>
            <Button 
              type="primary" 
              onClick={handleImport}
              disabled={selectedApps.length === 0}
            >
              导入选中应用 ({selectedApps.length})
            </Button>
          </Space>
        ) : null
      }
    >
      {scannedApps.length === 0 ? (
        <Tabs
          activeKey={importType}
          onChange={(key) => setImportType(key as ImportType)}
          items={tabItems}
        />
      ) : (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography.Title heading={5}>发现的应用 ({scannedApps.length})</Typography.Title>
            <Space>
              <Button
                size="small"
                onClick={() => {
                  if (selectedApps.length === scannedApps.length) {
                    setSelectedApps([]);
                  } else {
                    setSelectedApps(scannedApps.map(app => app.id));
                  }
                }}
              >
                {selectedApps.length === scannedApps.length ? '取消全选' : '全选'}
              </Button>
              <Button size="small" onClick={resetState}>重新扫描</Button>
            </Space>
          </div>
          <Table
            dataSource={scannedApps}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </div>
      )}
    </Modal>
  );
};
