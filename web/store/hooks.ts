import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState } from './reducers/rootReducer';
import type { AppDispatch } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
