package com.sharemarket.dao;

import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

/** Generic data-access contract implemented by every DAO. */
public interface Dao<T> {

    Optional<T> find(long id) throws SQLException;

    List<T> findAll() throws SQLException;

    T save(T entity) throws SQLException;

    boolean update(T entity) throws SQLException;

    boolean delete(long id) throws SQLException;
}
