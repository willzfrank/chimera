import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
export declare class DbService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    readonly pool: Pool;
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
