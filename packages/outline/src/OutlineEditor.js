import {useEffect, useState} from 'react';
import {TextNode} from './nodes/OutlineTextNode';
import {BlockNode} from './nodes/OutlineBlockNode';
import {createBodyNode} from './nodes/OutlineBodyNode';
import {createViewModel, updateViewModel, ViewModel} from './OutlineView';

function createOutlineEditor(editorElement, onChange) {
  const viewModel = new ViewModel();
  const body = createBodyNode();
  viewModel.body = body;
  viewModel.nodeMap.body = body;
  const outlineEditor = new OutlineEditor(editorElement, viewModel, onChange);
  outlineEditor._keyToDOMMap.set('body', editorElement);
  if (typeof onChange === 'function') {
    onChange(viewModel);
  }
  return outlineEditor;
}

class OutlineEditor {
  constructor(editorElement, viewModel, onChange) {
    // The editor element associated with this editor
    this._editorElement = editorElement;
    // The current view model
    this._viewModel = viewModel;
    // Handling of drafts and updates
    this._isUpdating = false;
    // Used during reconcilation
    this._keyToDOMMap = new Map();
    // onChange callback
    this._onChange = onChange;
    // Handling of transform
    this._textTransforms = new Set();
    // Mapping of types to their nodes
    this._registeredNodeTypes = new Map([
      ['block', BlockNode],
      ['text', TextNode],
      ['body', BlockNode],
    ]);
  }
  addNodeType(nodeType, Node) {
    this._registeredNodeTypes.set(nodeType, Node);
    return () => {
      this._registeredNodeTypes.delete(nodeType);
    };
  }
  addTextTransform(transformFn) {
    this._textTransforms.add(transformFn);
    return () => {
      this._textTransforms.delete(transformFn);
    };
  }
  isUpdating() {
    return this._isUpdating;
  }
  getEditorElement() {
    return this._editorElement;
  }
  getElementByKey(key) {
    const element = this._keyToDOMMap.get(key);
    if (element === undefined) {
      throw new Error('getElementByKey failed for key ' + key);
    }
    return element;
  }
  getCurrentViewModel() {
    return this._viewModel;
  }
  getDiffFromViewModel(viewModel) {
    const dirtySubTrees = viewModel._dirtySubTrees;
    const dirtyNodes = viewModel._dirtyNodes;
    const nodeMap = viewModel.nodeMap;

    if (dirtyNodes === null || dirtySubTrees === null) {
      throw new Error(
        'getDiffFromViewModel: unable to get diff from view mode',
      );
    }
    return {
      dirtySubTrees: dirtySubTrees,
      nodes: Array.from(dirtyNodes).map((nodeKey) => nodeMap[nodeKey]),
      selection: {...viewModel.selection},
      timeStamp: Date.now(),
    };
  }
  createViewModel(callbackFn) {
    return createViewModel(this._viewModel, callbackFn, this);
  }
  update(viewModel, forceSync) {
    if (this._isUpdating) {
      throw new Error('TODOL: Should never occur?');
    }
    if (viewModel === this._viewModel) {
      return;
    }
    if (forceSync) {
      updateViewModel(viewModel, this);
    } else {
      this._isUpdating = true;
      Promise.resolve().then(() => {
        this._isUpdating = false;
        updateViewModel(viewModel, this);
      });
    }
  }
}

export function useOutlineEditor(editorElementRef, onChange) {
  const [outlineEditor, setOutlineEditor] = useState(null);

  useEffect(() => {
    const editorElement = editorElementRef.current;

    if (editorElement !== null) {
      if (outlineEditor === null) {
        const newOutlineEditor = createOutlineEditor(editorElement, onChange);
        setOutlineEditor(newOutlineEditor);
      } else {
        outlineEditor._onChange = onChange;
      }
    } else if (outlineEditor !== null) {
      setOutlineEditor(null);
    }
  }, [editorElementRef, onChange, outlineEditor]);

  return outlineEditor;
}