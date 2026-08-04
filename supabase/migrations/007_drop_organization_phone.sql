-- Phone numbers are no longer shown or collected; drop the column.
alter table organizations drop column if exists phone;
