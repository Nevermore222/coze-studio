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

import type { ReactNode } from 'react';

import {
  ProductDraftStatus,
  type FrontWorkflowInfo,
} from '@coze-workflow/base';
import { I18n } from '@coze-arch/i18n';
import { Table, type TableActionProps } from '@coze-arch/coze-design';
import { useFlags } from '@coze-arch/bot-flags';
import {
  resource_resource_common,
  type ResourceInfo,
  ResType,
} from '@coze-arch/bot-api/plugin_develop';

import {
  parseWorkflowResourceBizExtend,
  transformResourceToWorkflowEditInfo,
} from './utils';
import { useWorkflowPublishEntry } from './use-workflow-publish-entry';
import { usePublishAction } from './use-publish-action';
import { useDeleteAction } from './use-delete-action';
import { useCopyAction } from './use-copy-action';
import { useChatflowSwitch } from './use-chatflow-switch';
import {
  type WorkflowResourceActionProps,
  type WorkflowResourceActionReturn,
} from './type';

// 导出导入功能函数
const exportWorkflow = async (record: ResourceInfo) => {
  try {
    // 验证必要参数
    if (!record.res_id || !record.space_id) {
      console.error('缺少必要的工作流ID或空间ID', { 
        res_id: record.res_id, 
        space_id: record.space_id 
      });
      return;
    }
    
    // 导入工作流API
    const { workflowApi } = await import('@coze-workflow/base');
    
    // 获取完整的工作流信息，包括schema
    const canvasRes = await workflowApi.GetCanvasInfo({
      space_id: record.space_id,
      workflow_id: record.res_id,
    });
    
    const workflowInfo = canvasRes?.data?.workflow;
    if (!workflowInfo) {
      console.error('无法获取工作流详细信息');
      return;
    }
    
    // 构建完整的导出数据
    const workflowData = {
      type: 'WORKFLOW_EXPORT',
      version: '1.0',
      workflowId: workflowInfo.workflow_id,
      name: workflowInfo.name,
      desc: workflowInfo.desc,
      iconUri: workflowInfo.icon_uri,
      createTime: workflowInfo.create_time,
      updateTime: workflowInfo.update_time,
      creator: workflowInfo.creator,
      flowMode: workflowInfo.flow_mode,
      schemaType: workflowInfo.schema_type,
      // 完整的工作流schema，这是最重要的部分
      schema: workflowInfo.schema_json ? JSON.parse(workflowInfo.schema_json) : null,
      // 原始schema字符串，便于调试
      schemaRaw: workflowInfo.schema_json,
      // 其他元数据
      metadata: {
        spaceId: record.space_id,
        resType: record.res_type,
        collaborationEnable: record.collaboration_enable,
        exportTime: new Date().toISOString(),
      },
    };
    
    // 创建下载文件
    const blob = new Blob([JSON.stringify(workflowData, null, 2)], {
      type: 'application/json',
    });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-${workflowInfo.name}-${workflowInfo.workflow_id}.json`;
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('工作流导出成功:', workflowData);
  } catch (error) {
    console.error('导出工作流失败:', error);
    // 可以在这里添加用户提示
  }
};

const importWorkflow = async (actionProps: WorkflowResourceActionProps) => {
  // 保存actionProps引用避免作用域问题
  const importProps = actionProps;
  
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  
  fileInput.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        console.log('导入的工作流数据:', content);
        
        // 检查文件格式
        if (content.type !== 'WORKFLOW_EXPORT' || !content.schema) {
          console.error('无效的工作流文件格式');
          alert('无效的工作流文件格式，请选择正确的导出文件');
          return;
        }
        
        // 检查必要参数
        if (!importProps.spaceId) {
          console.error('缺少空间ID，无法导入工作流');
          alert('缺少空间ID，无法导入工作流');
          return;
        }
        
        // 导入工作流API
        const { workflowApi } = await import('@coze-workflow/base');
        
        console.log('开始创建工作流...');
        
        // 创建新的工作流
        const createRes = await workflowApi.CreateWorkflow({
          name: content.name + '_imported_' + Date.now(),
          desc: content.desc || '导入的工作流',
          icon_uri: content.iconUri || '',
          space_id: importProps.spaceId,
          flow_mode: content.flowMode || 0, // 默认为普通工作流
          schema_type: content.schemaType || 1, // 默认FDL格式
        });
        
        console.log('工作流创建响应:', createRes);
        
        if (createRes?.data?.workflow_id) {
          console.log('工作流创建成功，开始保存schema...');
          
          // 如果有schema，则保存schema
          if (content.schema) {
            const saveRes = await workflowApi.SaveWorkflow({
              workflow_id: createRes.data.workflow_id,
              schema: typeof content.schema === 'string' ? content.schema : JSON.stringify(content.schema),
              space_id: importProps.spaceId,
              name: content.name + '_imported_' + Date.now(),
              desc: content.desc || '导入的工作流',
              icon_uri: content.iconUri || '',
              submit_commit_id: '',
            });
            
            console.log('schema保存响应:', saveRes);
          }
          
          console.log('工作流导入成功:', createRes.data.workflow_id);
          alert('工作流导入成功！');
          
          // 刷新页面
          if (importProps.refreshPage) {
            importProps.refreshPage();
          }
        } else {
          console.error('工作流创建失败:', createRes);
          alert('工作流创建失败，请检查控制台了解详细信息');
        }
      } catch (error) {
        console.error('解析或导入工作流失败:', error);
        alert('导入工作流失败: ' + (error.message || '未知错误'));
      }
    };
    reader.readAsText(file);
  });
  
  document.body.appendChild(fileInput);
  fileInput.click();
  document.body.removeChild(fileInput);
};

const { ActionKey } = resource_resource_common;

type ActionItemProps = NonNullable<TableActionProps['actionList']>[number];

export const useWorkflowResourceMenuActions = (
  props: WorkflowResourceActionProps & {
    userId?: string;
    onEditWorkflowInfo: (partialWorkflowInfo: FrontWorkflowInfo) => void;
  },
): Pick<WorkflowResourceActionReturn, 'renderWorkflowResourceActions'> & {
  modals: ReactNode[];
} => {
  const [FLAGS] = useFlags();
  const { userId, onEditWorkflowInfo, getCommonActions } = props;
  const { actionHandler: deleteAction, deleteModal } = useDeleteAction(props);
  const { actionHandler: copyAction } = useCopyAction(props);
  const { actionHandler: publishAction, publishModal } =
    usePublishAction(props);
  const { switchToChatflow, switchToWorkflow } = useChatflowSwitch({
    spaceId: props.spaceId ?? '',
    refreshPage: props.refreshPage,
  });
  const actionMap = {
    [ActionKey.Copy]: copyAction,
    [ActionKey.Delete]: deleteAction,
    [ActionKey.Edit]: (record: ResourceInfo) => {
      const workflowPartialInfo = transformResourceToWorkflowEditInfo(record);
      onEditWorkflowInfo(workflowPartialInfo as FrontWorkflowInfo);
    },
    [ActionKey.SwitchToFuncflow]: switchToWorkflow,
    [ActionKey.SwitchToChatflow]: switchToChatflow,
  };

  const { enablePublishEntry } = useWorkflowPublishEntry();
  // eslint-disable-next-line complexity
  const renderWorkflowResourceActions = (record: ResourceInfo): ReactNode => {
    const bizExtend = parseWorkflowResourceBizExtend(record.biz_extend);
    const productDraftStatus = bizExtend?.product_draft_status;
    const isImageFlow = record.res_type === ResType.Imageflow;
    const { actions } = record;
    const deleteActionConfig = actions?.find(
      action => action.key === ActionKey.Delete,
    );
    const copyActionConfig = actions?.find(
      action => action.key === ActionKey.Copy,
    );
    const editConfig = actions?.find(action => action.key === ActionKey.Edit);
    const chatflowConfig = actions?.find(
      action => action.key === ActionKey.SwitchToChatflow,
    );
    const workflowConfig = actions?.find(
      action => action.key === ActionKey.SwitchToFuncflow,
    );

    const isSelfCreator = record.creator_id === userId;
    const extraActions: ActionItemProps[] = [
      {
        hide: !editConfig,
        disabled: editConfig?.enable === false,
        actionKey: 'edit',
        actionText: I18n.t('Edit'),
        handler: () => actionMap?.[ActionKey.Edit]?.(record),
      },
      {
        actionKey: 'export',
        actionText: I18n.t('Export'),
        handler: () => {
          // 导出工作流为JSON文件
          exportWorkflow(record);
        },
      },
      {
        actionKey: 'import',
        actionText: I18n.t('Import'),
        handler: () => {
          // 导入工作流
          importWorkflow(props);
        },
      },
      {
        hide: !chatflowConfig,
        disabled: chatflowConfig?.enable === false,
        actionKey: 'switchChatflow',
        actionText: I18n.t('wf_chatflow_121', {
          flowMode: I18n.t('wf_chatflow_76'),
        }),
        handler: () => actionMap?.[ActionKey.SwitchToChatflow]?.(record),
      },
      {
        hide: !workflowConfig,
        disabled: workflowConfig?.enable === false,
        actionKey: 'switchWorkflow',
        actionText: I18n.t('wf_chatflow_121', { flowMode: I18n.t('Workflow') }),
        handler: () => actionMap?.[ActionKey.SwitchToFuncflow]?.(record),
      },
      ...(getCommonActions?.(record) ?? []),
      {
        hide:
          !enablePublishEntry || // The entrance on the shelf is white.
          (!FLAGS['bot.community.store_imageflow'] && isImageFlow) || // Imageflow does not support stores
          !isSelfCreator ||
          bizExtend?.plugin_id === '0',
        actionKey: 'publishWorkflowProduct',
        actionText:
          productDraftStatus === ProductDraftStatus.Default
            ? I18n.t('workflowstore_submit')
            : I18n.t('workflowstore_submit_update'),
        handler: () => {
          publishAction?.(record);
        },
      },
    ];
    return (
      <Table.TableAction
        deleteProps={{
          hide: !deleteActionConfig,
          disabled: deleteActionConfig?.enable === false,
          disableConfirm: true,
          handler: () => actionMap[ActionKey.Delete]?.(record),
        }}
        copyProps={{
          hide: !copyActionConfig,
          disabled: copyActionConfig?.enable === false,
          handler: () => actionMap[ActionKey.Copy]?.(record),
        }}
        actionList={extraActions}
      />
    );
  };
  return { renderWorkflowResourceActions, modals: [deleteModal, publishModal] };
};
