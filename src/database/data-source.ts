import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from './database-options';

export { createDataSourceOptions } from './database-options';

export const AppDataSource = new DataSource(createDataSourceOptions());
